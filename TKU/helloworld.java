public class helloworld {
    
    public static double EuclideanDistance(double[] tempVar1, double[] tempVar2){

        int n = tempVar1.length;
        double sum = 0.0;
        for(int i=0; i<n; i++){
            sum = sum +(tempVar1[i]-tempVar2[i])*(tempVar1[i]-tempVar2[i]);
        }
        return Math.sqrt(sum);
        
    }
}
