package TKU;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.List;

public class OpenFileExample {
    public static void main(String[] args) {
        String filename = "";
        if(args.length>0)
            filename = args[0];
        else
            filename = "TKU\\iris.txt";
        
        FileReader fr;
        String[] varName = null;
        int i = 0;
        int j = 0;
        List<String[]> dataList = new ArrayList<String[]>();
        int row = 0;
        int col = 0;
        
        try {
            fr = new FileReader(filename);
            BufferedReader br = new BufferedReader(fr);

            String line;
            while((line = br.readLine())!=null) {
                if(i==0) {
                    varName = line.split("\t");
                } else {
                    String[] tempData = line.split("\t");
                    String[] data = new String[tempData.length-2];
                    for(j=0; j<tempData.length-2; j++)
                        data[j] = tempData[j+2];
                    dataList.add(data);
                }
                i++;
            }
            
            col = varName.length-2;
            row = dataList.size();
            System.out.println("Row: " + row + ", Col: " + col);
            
            for(i=0; i<varName.length; i++) {
                System.out.println(varName[i]);
            }
            
            double[] tempVar1 = new double[col];
            double[] tempVar2 = new double[col];
            double[][] eucDistanceMatrix = new double[row][row];
            double[][] pearsonCorrMatrix = new double[row][row];  // 新增 Pearson 相關係數矩陣
            
            // 計算歐式距離和 Pearson 相關係數
            for(i=0; i<row; i++) {
                for(int k=0; k<row; k++) {
                    for(j=0; j<col; j++) {
                        tempVar1[j] = Double.valueOf(dataList.get(i)[j]);
                        tempVar2[j] = Double.valueOf(dataList.get(k)[j]);
                    }
                    // 計算歐式距離
                    double distance = TKU.helloworld.EuclideanDistance(tempVar1, tempVar2);
                    eucDistanceMatrix[i][k] = distance;
                    
                    // 計算 Pearson 相關係數
                    double correlation = TKU.helloworld.PearsonCorr(tempVar1, tempVar2);
                    pearsonCorrMatrix[i][k] = correlation;
                }
            }
            
            // 儲存歐式距離矩陣
            String outputFilename = "TKU\\distance.txt";
            File file = new File(outputFilename);
            BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(file, false), "utf8"));
            
            for(i=0; i<row; i++) {
                for(j=0; j<row; j++) {
                    writer.write(String.valueOf(eucDistanceMatrix[i][j]));
                    if(j<row-1)
                        writer.write("\t");
                }
                writer.newLine();
            }
            writer.close();
            
            // 儲存 Pearson 相關係數矩陣
            outputFilename = "TKU\\correlation.txt";
            file = new File(outputFilename);
            writer = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(file, false), "utf8"));
            
            for(i=0; i<row; i++) {
                for(j=0; j<row; j++) {
                    writer.write(String.valueOf(pearsonCorrMatrix[i][j]));
                    if(j<row-1)
                        writer.write("\t");
                }
                writer.newLine();
            }
            
            writer.close();
            br.close();
            fr.close();
            System.out.println("finish!");
            
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}